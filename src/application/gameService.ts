import { GameGateway } from '../dataaccess/gameGateway'
import { connectMySQl } from '../dataaccess/connection'
import { TurnRepository } from '../domain/turn/turnRepository'
import { firstTurn } from '../domain/turn/turn'
import { GameRepository } from '../domain/game/gameRepository'
import { Game } from '../domain/game/game'

const gameGateway = new GameGateway()

const turnRepository = new TurnRepository()
const gameRepository = new GameRepository()

// Gameに関する処理
export class GameService {
  async startNewGame() {
    const now = new Date()
    const conn = await connectMySQl()

    try {
      await conn.beginTransaction()
      // 新規ゲームの登録
      const game = await gameRepository.save(conn, new Game(undefined, now))
      if (!game.id) {
        throw new Error('game.id not exist')
      }
      // 初期盤面の登録
      const turn = firstTurn(game.id, now)
      await turnRepository.save(conn, turn)

      await conn.commit()
    } finally {
      await conn.end()
    }
  }
}
