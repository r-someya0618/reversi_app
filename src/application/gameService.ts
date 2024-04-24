import { GameGateway } from '../dataaccess/gameGateway'
import { TurnGateway } from '../dataaccess/turnGateway'
import { SquareGateway } from '../dataaccess/squareGateway'
import { connectMySQl } from '../dataaccess/connection'
import { DARK, INITIAL_BOARD } from '../application/constants'

const gameGateway = new GameGateway()
const turnGateway = new TurnGateway()
const squareGateway = new SquareGateway()

// Gameに関する処理
export class GameService {
  async startNewGame() {
    const now = new Date()
    const conn = await connectMySQl()

    try {
      await conn.beginTransaction()
      // 新規ゲームの登録
      const gameRecord = await gameGateway.insert(conn, now)
      // 初期盤面の登録
      const turnRecord = await turnGateway.insert(conn, gameRecord.id, 0, DARK, now)
      await squareGateway.insertAll(conn, turnRecord.id, INITIAL_BOARD)

      await conn.commit()
    } finally {
      await conn.end()
    }
  }
}
