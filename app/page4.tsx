import path from 'node:path'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { PromptTemplate } from '@langchain/core/prompts'
import { RunnablePassthrough, RunnableSequence } from '@langchain/core/runnables'
import { ChatGroq } from '@langchain/groq'
import { createSqlQueryChain } from 'langchain/chains/sql_db'
import { SqlDatabase } from 'langchain/sql_db'
import { QuerySqlTool } from 'langchain/tools/sql'
import { DataSource } from 'typeorm'

export default async function Home() {
	const datasource = new DataSource({
		type: 'sqlite',
		database: path.join(process.cwd(), 'public', 'Chinook.sqlite')
	})

	const db = await SqlDatabase.fromDataSourceParams({
		appDataSource: datasource
	})
	// console.log(db.allTables.map((t) => t.tableName))

	const llm = new ChatGroq({ model: 'llama-3.1-8b-instant', temperature: 0 })

	const executeQuery = new QuerySqlTool(db)
	const writeQuery = await createSqlQueryChain({
		llm,
		db,
		dialect: 'sqlite'
	})

	const answerPrompt = PromptTemplate.fromTemplate(`Given the following user question, corresponding SQL query, and SQL result, answer the user question.

Question: {question}
SQL Query: {query}
SQL Result: {result}
Answer: `)

	const answerChain = answerPrompt.pipe(llm).pipe(new StringOutputParser())

	const chain = RunnableSequence.from([
		RunnablePassthrough.assign({ query: writeQuery }).assign({
			result: (i: { query: string }) => executeQuery.invoke(i.query)
		}),
		answerChain
	])
	console.log(await chain.invoke({ question: 'How many employees are there' }))

	return (
		<main className='flex min-h-screen flex-col items-center justify-between p-24'>
			{/* <pre className='text-pretty'>{respuesta}</pre> */}
		</main>
	)
}
