
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const initSqlJs = require('sql.js')
const sqlJsPath = path.dirname(require.resolve('sql.js'))
const currentDir = path.dirname(fileURLToPath(import.meta.url))

let db: any
let databasePath = ''

function persistDatabase() {
  const data = db.export()
  fs.writeFileSync(databasePath, Buffer.from(data))
}

function queryAll(sql: string, params: any[] = []) {
  const statement = db.prepare(sql)
  statement.bind(params)

  const rows: any[] = []
  while (statement.step()) {
    rows.push(statement.getAsObject())
  }

  statement.free()
  return rows
}

function queryOne(sql: string, params: any[] = []) {
  return queryAll(sql, params)[0]
}

async function initializeDatabase() {
  databasePath = path.join(app.getPath('userData'), 'mangashelf.db')

  const SQL = await initSqlJs({
  locateFile: (file: string) => path.join(sqlJsPath, file),
})

  if (fs.existsSync(databasePath)) {
    const savedData = fs.readFileSync(databasePath)
    db = new SQL.Database(new Uint8Array(savedData))
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS manga (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL DEFAULT '',
      cover TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Plan to Read',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE
    );

    CREATE TABLE IF NOT EXISTS manga_tags (
      manga_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (manga_id, tag_id),
      FOREIGN KEY (manga_id) REFERENCES manga(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `)

  persistDatabase()

  ipcMain.handle('manga:get-all', () => {
    const mangas = queryAll(`
      SELECT id, title, url, cover, status
      FROM manga
      ORDER BY id DESC
    `)

    return mangas.map((manga) => ({
      ...manga,
      tags: queryAll(`
        SELECT t.name
        FROM tags t
        JOIN manga_tags mt ON mt.tag_id = t.id
        WHERE mt.manga_id = ?
        ORDER BY t.name COLLATE NOCASE
      `, [manga.id]).map((tag) => tag.name),
    }))
  })

  ipcMain.handle('manga:save', (_event, manga) => {
    if (!manga || typeof manga.title !== 'string' || !manga.title.trim()) {
      throw new Error('Judul manga wajib diisi.')
    }

    db.run('BEGIN TRANSACTION')

    try {
      let id: number

      if (Number.isInteger(manga.id)) {
        db.run(
          `UPDATE manga SET title = ?, url = ?, cover = ?, status = ?
           WHERE id = ?`,
          [
            manga.title.trim(),
            String(manga.url ?? ''),
            String(manga.cover ?? ''),
            String(manga.status ?? 'Plan to Read'),
            manga.id,
          ],
        )

        const existing = queryOne('SELECT id FROM manga WHERE id = ?', [manga.id])
        if (!existing) throw new Error('Manga tidak ditemukan.')

        id = manga.id
      } else {
        db.run(
          `INSERT INTO manga (title, url, cover, status)
           VALUES (?, ?, ?, ?)`,
          [
            manga.title.trim(),
            String(manga.url ?? ''),
            String(manga.cover ?? ''),
            String(manga.status ?? 'Plan to Read'),
          ],
        )

        id = Number(queryOne('SELECT last_insert_rowid() AS id').id)
      }

      db.run('DELETE FROM manga_tags WHERE manga_id = ?', [id])

      for (const name of Array.isArray(manga.tags) ? manga.tags : []) {
        if (typeof name !== 'string' || !name.trim()) continue

        db.run('INSERT OR IGNORE INTO tags (name) VALUES (?)', [name.trim()])

        const tag = queryOne('SELECT id FROM tags WHERE name = ?', [name.trim()])
        if (tag) {
          db.run(
            'INSERT OR IGNORE INTO manga_tags (manga_id, tag_id) VALUES (?, ?)',
            [id, tag.id],
          )
        }
      }

      db.run('COMMIT')
      persistDatabase()
      return id
    } catch (error) {
      db.run('ROLLBACK')
      throw error
    }
  })

  ipcMain.handle('manga:delete', (_event, id: number) => {
    db.run('DELETE FROM manga_tags WHERE manga_id = ?', [id])
    db.run('DELETE FROM manga WHERE id = ?', [id])
    persistDatabase()
    return true
  })

  
  ipcMain.handle('tags:rename', (_event, oldName: string, newName: string) => {
    const name = newName.trim()

    if (!name) {
      throw new Error('Nama tag tidak boleh kosong.')
    }

    const existing = queryOne(
      'SELECT id FROM tags WHERE name = ?',
      [oldName]
    )

    if (!existing) {
      throw new Error('Tag tidak ditemukan.')
    }

    const duplicate = queryOne(
      'SELECT id FROM tags WHERE name = ? AND id != ?',
      [name, existing.id]
    )

    if (duplicate) {
      throw new Error('Nama tag sudah digunakan.')
    }

    db.run('UPDATE tags SET name = ? WHERE id = ?', [
      name,
      existing.id
    ])

    persistDatabase()
    return true
  })


  ipcMain.handle('tags:get-all', () =>
    queryAll('SELECT name FROM tags ORDER BY name COLLATE NOCASE')
      .map((tag) => tag.name),
  )

  ipcMain.handle('tags:save', (_event, name: string) => {
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error('Nama tag wajib diisi.')
    }

    db.run('INSERT OR IGNORE INTO tags (name) VALUES (?)', [name.trim()])
    persistDatabase()
    return true
  })

  ipcMain.handle('tags:delete', (_event, name: string) => {
    const tag = queryOne('SELECT id FROM tags WHERE name = ?', [name])
    if (!tag) return false

    db.run('DELETE FROM manga_tags WHERE tag_id = ?', [tag.id])
    db.run('DELETE FROM tags WHERE id = ?', [tag.id])
    persistDatabase()
    return true
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'MangaShelf',
    backgroundColor: '#111318',
    webPreferences: {
      preload: path.join(currentDir, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    void win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    void win.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))
  }
}

app.whenReady().then(async () => {
  try {
    await initializeDatabase()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  } catch (error) {
    console.error('Gagal menginisialisasi MangaShelf:', error)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (db) {
    persistDatabase()
    db.close()
  }
})
