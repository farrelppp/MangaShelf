
import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen, Search, Plus, LayoutGrid, Tags, Settings,
  ExternalLink, Pencil, Trash2, X, LibraryBig, Heart,
} from 'lucide-react'
import './App.css'

type Manga = {
  id: number
  title: string
  url: string
  cover: string
  tags: string[]
  status: string
}



function App() {
  const [mangaList, setMangaList] = useState<Manga[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState('All')
  const [page, setPage] = useState('Library')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newCover, setNewCover] = useState('')
  const [newTags, setNewTags] = useState<string[]>([])
  const [newStatus, setNewStatus] = useState('Plan to Read')
  const [renamingTag, setRenamingTag] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const filteredManga = useMemo(() => mangaList.filter(manga => {
    const matchesQuery = manga.title.toLowerCase().includes(query.toLowerCase())
    const matchesTag = activeTag === 'All' || manga.tags.includes(activeTag)
    return matchesQuery && matchesTag
  }), [mangaList, query, activeTag])

  async function loadData() {
  try {
    const [mangas, savedTags] = await Promise.all([
      window.mangaAPI.getManga(),
      window.mangaAPI.getTags(),
    ])

    setMangaList(mangas)
    setTags(savedTags)
  } catch (error) {
    console.error('Gagal memuat koleksi:', error)
    alert('Gagal memuat database MangaShelf. Periksa terminal.')
  } finally {
    setLoading(false)
  }
}

useEffect(() => {
  void loadData()
}, [])

  function openAddModal() {
    setEditingId(null)
    setNewTitle('')
    setNewUrl('')
    setNewCover('')
    setNewTags([])
    setNewStatus('Plan to Read')
    setShowModal(true)
  }

  function openEditModal(manga: Manga) {
    setEditingId(manga.id)
    setNewTitle(manga.title)
    setNewUrl(manga.url)
    setNewCover(manga.cover)
    setNewTags(manga.tags)
    setNewStatus(manga.status)
    setShowModal(true)
  }

  async function saveManga() {
  if (!newTitle.trim()) {
    alert('Judul manga wajib diisi.')
    return
  }

  try {
    await window.mangaAPI.saveManga({
      ...(editingId !== null ? { id: editingId } : {}),
      title: newTitle.trim(),
      url: newUrl.trim(),
      cover: newCover.trim(),
      tags: newTags,
      status: newStatus,
    })

    await loadData()
    setShowModal(false)
  } catch (error) {
    console.error('Gagal menyimpan manga:', error)
    alert('Gagal menyimpan manga ke database.')
  }
}

  async function addTag() {
  const value = tagInput.trim()
  if (!value) return

  try {
    await window.mangaAPI.saveTag(value)
    await loadData()
    setTagInput('')
  } catch (error) {
    console.error('Gagal menyimpan tag:', error)
    alert('Gagal menyimpan tag.')
  }
}

  


async function renameTag() {
  if (!renamingTag) return

  const oldName = renamingTag
  const newName = renameValue.trim()

  if (!newName) {
    alert('Nama tag tidak boleh kosong.')
    return
  }

  if (newName.toLowerCase() === oldName.toLowerCase()) {
    setRenamingTag(null)
    setRenameValue('')
    return
  }

  try {
    await window.mangaAPI.renameTag(oldName, newName)
    await loadData()

    if (activeTag === oldName) {
      setActiveTag(newName)
    }

    setNewTags((old) =>
      old.map((tag) => tag === oldName ? newName : tag)
    )

    setRenamingTag(null)
    setRenameValue('')
  } catch (error) {
    console.error('Gagal rename tag:', error)
    alert(`Gagal mengganti nama tag: ${String(error)}`)
  }
}




  async function deleteTag(tagToDelete: string) {
  if (!confirm(`Hapus tag "${tagToDelete}" dari koleksi?`)) return

  try {
    await window.mangaAPI.deleteTag(tagToDelete)
    await loadData()

    if (activeTag === tagToDelete) {
      setActiveTag('All')
    }
  } catch (error) {
    console.error('Gagal menghapus tag:', error)
    alert('Gagal menghapus tag.')
  }
}

  if (loading) {
    return <div className="app-shell">Memuat koleksi MangaShelf...</div>
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><BookOpen size={23} /></div>
          <div><strong>MangaShelf</strong><span>YOUR PERSONAL LIBRARY</span></div>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <button className={`nav-item ${page === 'Library' ? 'active' : ''}`}
          onClick={() => setPage('Library')}>
          <LayoutGrid size={18} /> Library
          <span className="nav-count">{mangaList.length}</span>
        </button>
        <button className={`nav-item ${page === 'Tags' ? 'active' : ''}`}
          onClick={() => setPage('Tags')}>
          <Tags size={18} /> Manage Tags
        </button>

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Heart size={17} />
            <p>Your collection, your rules.</p>
            <span>Organize the stories you love.</span>
          </div>
          <button className="nav-item" onClick={() => alert('Pengaturan akan ditambahkan nanti.')}>
            <Settings size={18} /> Settings
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <span>My Workspace <span className="breadcrumb">/ {page}</span></span>
          <span className="local-label"><span /> LOCAL LIBRARY</span>
        </header>

        {page === 'Library' ? (
          <>
            <section className="welcome">
              <div>
                <div className="eyebrow">YOUR COLLECTION</div>
                <h1>Your Manga Library<span>.</span></h1>
                <p>All your favorite stories, organized your way.</p>
              </div>
              <button className="primary-button" onClick={openAddModal}>
                <Plus size={18} /> Add Manga
              </button>
            </section>

            <section className="toolbar">
              <div className="search-box">
                <Search size={18} />
                <input value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Search your collection..." />
                {query && <button onClick={() => setQuery('')}><X size={16} /></button>}
              </div>
              <span className="result-count">{filteredManga.length} TITLES</span>
            </section>

            <section className="tag-filter">
              <button className={`tag-chip ${activeTag === 'All' ? 'selected' : ''}`}
                onClick={() => setActiveTag('All')}>All Manga</button>
              {tags.map(tag => (
                <button key={tag} className={`tag-chip ${activeTag === tag ? 'selected' : ''}`}
                  onClick={() => setActiveTag(tag)}>{tag}</button>
              ))}
            </section>

            <section className="library-grid">
              {filteredManga.map(manga => (
                <article className="manga-card" key={manga.id}>
                  <div className="cover-wrap">
                    <img src={manga.cover} alt={manga.title}
                      onError={e => { e.currentTarget.src = 'https://placehold.co/400x560/27233a/ffffff?text=Manga' }} />
                    <span className="status-pill">{manga.status}</span>
                    <div className="card-actions">
                      <button title="Edit manga" onClick={() => openEditModal(manga)}><Pencil size={16} /></button>
                      <button title="Delete manga" onClick={async () => {
                        if (!confirm(`Hapus ${manga.title}?`)) return

                        try {
                          await window.mangaAPI.deleteManga(manga.id)
                          await loadData()
                        } catch (error) {
                          console.error('Gagal menghapus manga:', error)
                          alert('Gagal menghapus manga.')
                        }
                      }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="card-info">
                    <h3>{manga.title}</h3>
                    <div className="card-tags">
                      {manga.tags.map(tag => <span key={tag}>{tag}</span>)}
                      {manga.tags.length === 0 && <span className="muted-tag">No tags</span>}
                    </div>
                    <button className="open-link" disabled={!manga.url}
                      onClick={() => window.open(manga.url, '_blank', 'noopener,noreferrer')}>
                      Open source <ExternalLink size={14} />
                    </button>
                  </div>
                </article>
              ))}
              {filteredManga.length === 0 && (
                <div className="empty-state">
                  <LibraryBig size={36} />
                  <h3>No manga found</h3>
                  <p>Try another search or add a new manga to your library.</p>
                  <button className="primary-button" onClick={openAddModal}><Plus size={17} /> Add Manga</button>
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="tags-page">
            <div className="eyebrow">ORGANIZE YOUR COLLECTION</div>
            <h1>Manage Tags<span>.</span></h1>
            <p>Create and manage your own tags. No predefined categories.</p>
            <form className="add-tag-form" onSubmit={e => { e.preventDefault(); addTag() }}>
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                placeholder="Create a new tag..." />
              <button className="primary-button" type="submit"><Plus size={17} /> Add Tag</button>
            </form>
            <div className="managed-tags">
              {tags.map(tag => (
                <div className="managed-tag" key={tag}>
                  <div className="tag-symbol"><Tags size={17} /></div>
                  <strong>{tag}</strong>
                  <span>{mangaList.filter(manga => manga.tags.includes(tag)).length} manga</span>                 
                  <button
                    type="button"
                    title="Rename tag"
                    onClick={() => {
                      setRenamingTag(tag)
                      setRenameValue(tag)
                    }}
                  >
                    <Pencil size={16} />
                  </button>
                  <button title="Delete tag" onClick={() => deleteTag(tag)}><Trash2 size={16} /></button>
                </div>
              ))}
              {tags.length === 0 && <p>No tags yet. Create your first custom tag above.</p>}
            </div>
          </section>
        )}
      </main>

      {showModal && (
        <div className="modal-backdrop" onMouseDown={e => {
          if (e.target === e.currentTarget) setShowModal(false)
        }}>
          <form className="manga-modal" onSubmit={e => { e.preventDefault(); saveManga() }}>
            <div className="modal-header">
              <div><h2>{editingId === null ? 'Add Manga' : 'Edit Manga'}</h2>
                <p>Keep all your manga links in one place.</p></div>
              <button type="button" className="icon-button" onClick={() => setShowModal(false)}><X /></button>
            </div>

            <label>Title *
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="Enter manga title..." required autoFocus />
            </label>
            <label>Source URL
              <input type="url" value={newUrl} onChange={e => setNewUrl(e.target.value)}
                placeholder="https://example.com/manga" />
            </label>
            <label>Cover image URL
              <input type="url" value={newCover} onChange={e => setNewCover(e.target.value)}
                placeholder="https://example.com/cover.jpg" />
            </label>
            <label>Status
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                <option>Plan to Read</option><option>Reading</option>
                <option>Completed</option><option>Dropped</option>
              </select>
            </label>
            <label>Assign your tags</label>
            <div className="modal-tag-list">
              {tags.map(tag => (
                <button type="button" key={tag}
                  className={`tag-chip ${newTags.includes(tag) ? 'selected' : ''}`}
                  onClick={() => setNewTags(old => old.includes(tag)
                    ? old.filter(item => item !== tag) : [...old, tag])}>
                  {newTags.includes(tag) ? '✓ ' : '+ '}{tag}
                </button>
              ))}
              {tags.length === 0 && <span className="muted-tag">Create tags in Manage Tags first.</span>}
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="primary-button"><Plus size={17} /> Save Manga</button>
            </div>
          </form>
        </div>
      )}
      {renamingTag !== null && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Rename Tag</h2>

            <p>
              Ganti nama tag <strong>{renamingTag}</strong>
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault()
                void renameTag()
              }}
            >
              <input
                type="text"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                placeholder="Nama tag baru"
                autoFocus
              />

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setRenamingTag(null)
                    setRenameValue('')
                  }}
                >
                  Batal
                </button>

                <button type="submit">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
