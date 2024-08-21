import path from 'node:path'
import { ChatGroq } from '@langchain/groq'
import { createSqlQueryChain } from 'langchain/chains/sql_db'
import { SqlDatabase } from 'langchain/sql_db'
import { DataSource } from 'typeorm'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'

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

	const SYSTEM_PROMPT = `Double check the user's {dialect} query for common mistakes, including:
- Using NOT IN with NULL values
- Using UNION when UNION ALL should have been used
- Using BETWEEN for exclusive ranges
- Data type mismatch in predicates
- Properly quoting identifiers
- Using the correct number of arguments for functions
- Casting to the correct data type
- Using the proper columns for joins

If there are any of the above mistakes, rewrite the query. If there are no mistakes, just reproduce the original query.

Print only the final SQL query in plain text.`

	const prompt = await ChatPromptTemplate.fromMessages([
		['system', SYSTEM_PROMPT],
		['human', '{query}']
	]).partial({ dialect: 'sqlite' })

	const validationChain = prompt.pipe(llm).pipe(new StringOutputParser())

	const fullChain = RunnableSequence.from([
		{
			query: async (i: { question: string }) => chain.invoke(i)
		},
		validationChain
	])
	const query = await fullChain.invoke({
		question: "What's the average Invoice from an American customer whose Fax is missing since 2003 but before 2010"
	})

	console.log('query:', query)

	console.log('db query results:', await db.run(query))

	return (
		<main className='flex min-h-screen flex-col items-center justify-between p-24'>
			<p>ño</p>
		</main>
	)
}
