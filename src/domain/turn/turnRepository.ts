import { Turn } from './turn'
import mysql from 'mysql2/promise'
import { TurnGateway } from '../../dataaccess/turnGateway'
import { MoveGateway } from '../../dataaccess/moveGateway'
import { SquareGateway } from '../../dataaccess/squareGateway'
import { Move } from './move'
import { toDisc } from './disc'
import { Point } from './point'
import { Board } from './board'

const turnGateway = new TurnGateway()
const moveGateway = new MoveGateway()
const squareGateway = new SquareGateway()

export class TurnRepository {
  async findForGameIdAndTurnCount(
    conn: mysql.Connection,
    gameId: number,
    turnCount: number
  ): Promise<Turn> {
    // game idと turn_countで絞り込みターンの情報を取得する
    const turnRecord = await turnGateway.findForGameIdAndTurnCount(
      conn,
      gameId,
      turnCount
    )
    if (!turnRecord) {
      throw new Error('Specified turn not found')
    }

    // turnの情報から盤面情報を取得
    const squareRecords = await squareGateway.findForTurnId(conn, turnRecord.id)

    // 8x8の２次元配列を作成
    const board = Array.from(Array(8)).map(() => Array.from(Array(8)))
    // 盤面の石の情報をboard配列に入れる
    squareRecords.forEach((s) => {
      board[s.y][s.x] = s.disc
    })

    const moveRecord = await moveGateway.findForTurnId(conn, turnRecord.id)
    let move: Move | undefined
    if (moveRecord) {
      move = new Move(toDisc(moveRecord.disc), new Point(moveRecord.x, moveRecord.y))
    }

    return new Turn(
      gameId,
      turnCount,
      toDisc(turnRecord.nextDisc),
      move,
      new Board(board),
      turnRecord.endAt
    )
  }

  async save(conn: mysql.Connection, turn: Turn) {
    const turnRecord = await turnGateway.insert(
      conn,
      turn.gameId,
      turn.turnCount,
      turn.nextDisc,
      turn.endAt
    )
    // 盤面の保存
    await squareGateway.insertAll(conn, turnRecord.id, turn.board.discs)

    if (turn.move) {
      // 手の保存
      await moveGateway.insert(
        conn,
        turnRecord.id,
        turn.move.disc,
        turn.move.point.x,
        turn.move.point.y
      )
    }
  }
}
