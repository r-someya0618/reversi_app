import mysql from 'mysql2/promise'
import { GameGateway } from '../../infrastructure/gameGateway'
import { Game } from './game'

const gameGateway = new GameGateway()

export class GameRepository {
  async findLatest(conn: mysql.Connection): Promise<Game | undefined> {
    // 最新のgameテーブルの対戦情報を取得
    const gameRecord = await gameGateway.findLatest(conn)
    // 対戦情報が完全に未登録の場合
    if (!gameRecord) {
      return undefined
    }

    return new Game(gameRecord.id, gameRecord.startedAt)
  }

  async save(conn: mysql.Connection, game: Game): Promise<Game> {
    // 新規ゲームの登録
    const gameRecord = await gameGateway.insert(conn, game.startedAt)

    return new Game(gameRecord.id, gameRecord.startedAt)
  }
}
