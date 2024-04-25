import mysql from 'mysql2/promise'

export async function connectMySQl() {
  return await mysql.createConnection({
    host: 'localhost',
    database: 'reversi',
    user: 'reversi',
    password: 'password',
  })
}
