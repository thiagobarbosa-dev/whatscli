import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'
const isJson = process.argv.includes('--json')
const level = isJson ? 'silent' : (process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'))

export const logger = pino(
  isDev
    ? {
        level,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname',
            messageFormat: '{msg}',
            destination: 2 // stderr
          },
        },
      }
    : { level },
  pino.destination(2) // stderr for production as well
)

/** Change logger level at runtime (e.g. to silence logs in JSON mode) */
export function setLogLevel(newLevel: pino.LevelWithSilent): void {
  logger.level = newLevel
}
