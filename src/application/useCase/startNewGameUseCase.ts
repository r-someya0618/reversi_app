import { connectMySQl } from '../../infrastructure/connection'
import { firstTurn } from '../../domain/model/turn/turn'
import { Game } from '../../domain/model/game/game'
import { GameRepository } from '../../domain/model/game/gameRepository'
import { TurnRepository } from '../../domain/model/turn/turnRepository'

// Gameに関する処理
export class StartNewGameUseCase {
  constructor(
    private _gameRepository: GameRepository,
    private _turnRepository: TurnRepository
  ) {}

  async run() {
    const now = new Date()
    const conn = await connectMySQl()

    try {
      await conn.beginTransaction()
      // 新規ゲームの登録
      const game = await this._gameRepository.save(conn, new Game(undefined, now))
      if (!game.id) {
        throw new Error('game.id not exist')
      }
      // 初期盤面の登録
      const turn = firstTurn(game.id, now)
      await this._turnRepository.save(conn, turn)

      await conn.commit()
    } finally {
      await conn.end()
    }
  }
}
