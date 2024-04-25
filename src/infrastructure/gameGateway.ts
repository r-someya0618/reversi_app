import mysql from 'mysql2/promise'
import { GameRecord } from './gameRecord'

export class GameGateway {
  // 最新のゲームデータを取得する
  async findLatest(conn: mysql.Connection): Promise<GameRecord | undefined> {
    const gameSelectResult = await conn.execute<mysql.RowDataPacket[]>(
      'select id, started_at from games order by id desc limit 1'
    )
    const record = gameSelectResult[0][0]

    if (!record) {
      return undefined
    }

    // GameRecordクラスのインスタンスをreturn
    return new GameRecord(record['id'], record['started_at'])
  }

  // 新しくゲームを登録する
  async insert(conn: mysql.Connection, startedAt: Date): Promise<GameRecord> {
    const gameInsertResult = await conn.execute<mysql.ResultSetHeader>(
      'insert into games (started_at) values (?)',
      [startedAt]
    )
    const gameId = gameInsertResult[0].insertId

    return new GameRecord(gameId, startedAt)
  }
}
