import mysql from 'mysql2/promise'
import { MoveRecord } from './moveRecord'

export class MoveGateway {
  // 新しくmove(手)を登録する
  async insert(
    conn: mysql.Connection,
    turnId: number,
    disc: number,
    x: number,
    y: number
  ) {
    await conn.execute(
      'insert into moves (turn_id, disc, x,y) values (?, ?, ?, ?)',
      [turnId, disc, x, y]
    )
  }
}
