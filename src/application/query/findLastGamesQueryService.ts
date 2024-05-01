import mysql from 'mysql2/promise'

export class FindLastGamesQueryModel {
  constructor(
    private _gameId: number,
    private _darkMoveCount: number,
    private _lightMoveCount: number,
    private _winnerDisc: number,
    private _startedAt: Date,
    private _endAt: Date
  ) {}

  get gameId() {
    return this._gameId
  }
  get darkMoveCount() {
    return this._darkMoveCount
  }
  get lightMoveCount() {
    return this._lightMoveCount
  }
  get startedAt() {
    return this._startedAt
  }
  get winnerDisc() {
    return this._winnerDisc
  }
  get endAt() {
    return this._endAt
  }
}

export interface FindLastGamesQueryService {
  query(conn: mysql.Connection, limit: number): Promise<FindLastGamesQueryModel[]>
}
