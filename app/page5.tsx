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
		type: 'postgres',
		host: process.env.DB_HOST,
		port: Number(process.env.DB_PORT),
		username: process.env.DB_USERNAME,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_DATABASE,
		schema: process.env.DB_SCHEMA
		// logging: true
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
		dialect: 'postgres'
	})

	const answerPrompt = PromptTemplate.fromTemplate(`Given the following user question, corresponding SQL query, and SQL result, answer the user question.

Question: {question}
SQL Query: {query}
SQL Result: {result}
Answer: `)

	const answerChain = answerPrompt.pipe(llm).pipe(new StringOutputParser())

	const chain = RunnableSequence.from([
		RunnablePassthrough.assign({ query: writeQuery }).assign({
			result: (i: { query: string }) => {
				console.log('running query:', i.query)
				return executeQuery.invoke(extractSQLQuery(i.query))
			}
		}),
		answerChain
	])

	const query = await chain.invoke({
		question: "What's the average Invoice from an American customer whose tax is missing since 2003 but before 2010"
	})

	// Función para extraer la consulta SQL en diferentes formatos
	function extractSQLQuery(queryText: string) {
		let sqlQuery = queryText

		// Caso 1: Bloque de código SQL (```sql ... ```)
		const sqlBlockMatch = queryText.match(/```sql\s*([\s\S]*?)\s*```/)
		if (sqlBlockMatch) {
			sqlQuery = sqlBlockMatch[1].trim()
		} else {
			// Caso 2: Formato "SQLQuery: SELECT ..."
			const sqlQueryMatch = queryText.match(/SQLQuery:\s*(.*)/i)
			if (sqlQueryMatch) {
				sqlQuery = sqlQueryMatch[1].trim()
			}
		}

		return sqlQuery
	}

	console.log('query:', query)

	return (
		<main className='flex min-h-screen flex-col items-center justify-between p-24'>
			<p>ño</p>
		</main>
	)
}
