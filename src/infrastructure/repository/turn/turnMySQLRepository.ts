import mysql from 'mysql2/promise'
import { TurnGateway } from './turnGateway'
import { MoveGateway } from '../../../infrastructure/moveGateway'
import { SquareGateway } from '../../../infrastructure/squareGateway'
import { Turn } from '../../../domain/model/turn/turn'
import { Move } from '../../../domain/model/turn/move'
import { toDisc } from '../../../domain/model/turn/disc'
import { Point } from '../../../domain/model/turn/point'
import { Board } from '../../../domain/model/turn/board'
import { DomainError } from '../../../domain/error/domainError'

const turnGateway = new TurnGateway()
const moveGateway = new MoveGateway()
const squareGateway = new SquareGateway()

export class TurnMySQLRepository {
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
      throw new DomainError('SpecifiedTurnNotFound', 'Specified turn not found')
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

    const nextDisc =
      turnRecord.nextDisc === null ? undefined : toDisc(turnRecord.nextDisc)

    return new Turn(
      gameId,
      turnCount,
      nextDisc,
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
