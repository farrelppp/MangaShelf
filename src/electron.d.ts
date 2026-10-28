export {}

declare global {
  interface Window {
    mangaAPI: {
      getManga: () => Promise<{
        id: number
        title: string
        url: string
        cover: string
        tags: string[]
        status: string
      }[]>

      saveManga: (manga: {
        id?: number
        title: string
        url: string
        cover: string
        tags: string[]
        status: string
      }) => Promise<number>

      deleteManga: (id: number) => Promise<boolean>
      getTags: () => Promise<string[]>
      saveTag: (name: string) => Promise<boolean>
      deleteTag: (name: string) => Promise<boolean>
      renameTag: (oldName: string, newName: string) => Promise<boolean>
    }
  }
}
