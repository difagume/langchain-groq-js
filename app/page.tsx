import path from 'node:path'
import { ChatGroq } from '@langchain/groq'
import { createSqlQueryChain } from 'langchain/chains/sql_db'
import { SqlDatabase } from 'langchain/sql_db'
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
	const chain = await createSqlQueryChain({
		llm,
		db,
		dialect: 'sqlite'
	})

	const response = await chain.invoke({
		question: 'How many employees are there'
	})

	const sqlQuery = response.match(/SQLQuery:\s*(.*)/)
	let respuesta = ''

	if (sqlQuery?.[1]) {
		respuesta = await db.run(sqlQuery[1].trim())
		console.log('db run result:', respuesta)
	}

	return (
		<main className='flex min-h-screen flex-col items-center justify-between p-24'>
			<pre className='text-pretty'>{respuesta}</pre>
		</main>
	)
}
