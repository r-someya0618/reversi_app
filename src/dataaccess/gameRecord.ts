// gameテーブルと対応するクラス
// RecordではなくEntityが使われる場合もある
export class GameRecord {
  constructor(private _id: number, private _startedAt: Date) {}

  get id() {
    return this._id
  }
}
