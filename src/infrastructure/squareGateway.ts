import mysql from 'mysql2/promise'
import { SquareRecord } from './squareRecord'

export class SquareGateway {
  // 盤面の情報を取得する
  async findForTurnId(
    conn: mysql.Connection,
    turnId: number
  ): Promise<SquareRecord[]> {
    // turnの情報から一つ前の盤面情報を取得
    const squaresSelectResult = await conn.execute<mysql.RowDataPacket[]>(
      'select id, turn_id, x, y, disc from squares where turn_id = ?',
      [turnId]
    )
    const records = squaresSelectResult[0]
    return records.map((r) => {
      return new SquareRecord(r['id'], r['turn_id'], r['x'], r['y'], r['disc'])
    })
  }
  // 盤面の情報を登録
  async insertAll(conn: mysql.Connection, turnId: number, board: number[][]) {
    // 盤面の数をカウントする
    const squareCount = board
      .map((line) => line.length)
      .reduce((v1, v2) => v1 + v2, 0)

    // 盤面を登録するSQL文
    // 'insert into squares (turn_id, x, y, disc) values (?, ?, ?, ?), (?, ?, ?, ?) ...64個になる... (?, ?, ?, ?),
    const squareInsertSql =
      'insert into squares (turn_id, x, y, disc) values ' +
      Array.from(Array(squareCount))
        .map(() => '(?, ?, ?, ?)')
        .join(', ')

    // 盤面を登録
    const squaresInsertValues: any[] = []
    board.forEach((line, y) => {
      // 一次元目の配列の要素数のカウント => 縦方向の数 = y
      /**
       * [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY], → line、y = 0
       * ~省略~
       * [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY], → line、y = 7
       */
      line.forEach((disc, x) => {
        // 二次元目の配列の要素数のカウント → 横方向の数 = x
        // [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY] → disc = 0 (EMPTYで定義)、x = ０から7
        squaresInsertValues.push(turnId)
        squaresInsertValues.push(x)
        squaresInsertValues.push(y)
        squaresInsertValues.push(disc)
      })
    })
    await conn.execute(squareInsertSql, squaresInsertValues)
  }
}
