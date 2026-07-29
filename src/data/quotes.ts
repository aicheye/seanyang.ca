import quotes from '@public/data/quotes.json'

export interface Quote {
  text: string
  author: string
}

export default quotes as Quote[]
