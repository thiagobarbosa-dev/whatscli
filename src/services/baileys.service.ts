import makeWASocket, {
  DisconnectReason,
  WASocket,
  ConnectionState,
  Browsers,
  fetchLatestWaWebVersion
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { getAuthState } from '../auth/state.js'
import { logger } from '../utils/logger.js'

export interface ConnectOptions {
  storeDir: string
  /** Called when a new QR code is generated */
  onQR?: (qr: string) => void
  /** Called on every connection state change */
  onConnectionUpdate?: (update: Partial<ConnectionState>) => void
}

class BaileysService {
  private socket: WASocket | null = null
  private shouldReconnect = true
  private reconnectDelay = 1_000 // ms — doubles on each failure
  private readonly maxReconnectDelay = 5 * 60 * 1_000 // 5 minutes cap

  /** Connect to WhatsApp Web. Returns the socket on first open connection. */
  async connect(opts: ConnectOptions): Promise<WASocket> {
    this.shouldReconnect = true
    return this._createSocket(opts)
  }

  private async _createSocket(opts: ConnectOptions): Promise<WASocket> {
    const { state, saveCreds } = await getAuthState(opts.storeDir)
    
    // Fetch latest WA Web version to avoid 405 Connection Failure due to outdated version
    const { version } = await fetchLatestWaWebVersion()
    logger.debug({ version }, 'Fetched latest wa web version')

    const socket = makeWASocket({
      version,
      auth: state,
      // Don't let Baileys print raw QR — we handle it ourselves
      printQRInTerminal: false,
      // Suppress Baileys' internal noise; inherit global level (Rule 39)
      logger: logger.child({ name: 'baileys' }, { level: logger.level }) as Parameters<typeof makeWASocket>[0]['logger'],
      browser: Browsers.ubuntu('Desktop'),
    })

    this.socket = socket

    // Persist credentials whenever they are updated
    socket.ev.on('creds.update', saveCreds)

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      // Surface QR code to the caller
      if (qr && opts.onQR) opts.onQR(qr)

      // Surface all updates to the caller
      if (opts.onConnectionUpdate) opts.onConnectionUpdate(update)

      if (connection === 'open') {
        // Successful connection — reset backoff
        this.reconnectDelay = 1_000
        logger.info('Connected to WhatsApp')
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode

        logger.debug({ statusCode }, 'Connection closed')

        // Rule 24: loggedOut is fatal — wipe auth and exit
        if (statusCode === DisconnectReason.loggedOut) {
          logger.error(
            'Session logged out by WhatsApp. Run "whatscli auth" to re-authenticate.'
          )
          process.exit(2)
        }

        // Rule 25: connectionReplaced is fatal but keep auth
        if (statusCode === DisconnectReason.connectionReplaced) {
          logger.error('Connection replaced by another instance. Exiting.')
          process.exit(1)
        }

        // Reconnect with exponential backoff for all other cases
        if (this.shouldReconnect) {
          await this._reconnect(opts)
        }
      }
    })

    return socket
  }

  private async _reconnect(opts: ConnectOptions): Promise<void> {
    logger.info({ delayMs: this.reconnectDelay }, 'Reconnecting to WhatsApp...')
    await new Promise<void>((resolve) => setTimeout(resolve, this.reconnectDelay))

    // Exponential backoff capped at maxReconnectDelay
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)

    await this._createSocket(opts)
  }

  /** Get the active socket. Throws if not connected. */
  getSocket(): WASocket {
    if (!this.socket) {
      throw new Error('Not connected. Run "whatscli auth" first.')
    }
    return this.socket
  }

  /** Gracefully disconnect without triggering reconnect. */
  disconnect(): void {
    this.shouldReconnect = false
    this.socket?.ev.flush()
    this.socket?.end(undefined)
    this.socket = null
  }
}

/** Singleton Baileys service — shared across the entire process. */
export const baileysService = new BaileysService()
