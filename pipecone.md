Semantic search

Copy page
Find semantically similar records using dense vectors.

This page shows you how to search a dense index for records that are most similar in meaning and context to a query. This is often called semantic search, nearest neighbor search, similarity search, or just vector search.
Semantic search uses dense vectors. Each number in a dense vector corresponds to a point in a multidimensional space. Vectors that are closer together in that space are semantically similar.
​
Search with text
Searching with text is supported only for indexes with integrated embedding.
To search a dense index with a query text, use the search_records operation with the following parameters:
The namespace to query. To use the default namespace, set the namespace to "**default**".
The query.inputs.text parameter with the query text. Pinecone uses the embedding model integrated with the index to convert the text to a dense vector automatically.
The query.top_k parameter with the number of similar records to return.
Optionally, you can specify the fields to return in the response. If not specified, the response will include all fields.
For example, the following code searches for the 2 records most semantically related to a query text:

C#

curl
import { Pinecone } from '@pinecone-database/pinecone'

const pc = new Pinecone({ apiKey: "YOUR_API_KEY" })

// To get the unique host for an index,
// see https://docs.pinecone.io/guides/manage-data/target-an-index
const namespace = pc.index("INDEX_NAME", "INDEX_HOST").namespace("example-namespace");

const response = await namespace.searchRecords({
query: {
topK: 2,
inputs: { text: 'Disease prevention' },
},
fields: ['chunk_text', 'category'],
});

console.log(response);
The response will look as follows. Each record is returned with a similarity score that represents its distance to the query vector, calculated according to the similarity metric for the index.

C#

curl
{
result: {
hits: [
{
_id: 'rec3',
_score: 0.82042724,
fields: {
category: 'immune system',
chunk_text: 'Rich in vitamin C and other antioxidants, apples contribute to immune health and may reduce the risk of chronic diseases.'
}
},
{
_id: 'rec1',
_score: 0.7931626,
fields: {
category: 'digestive system',
chunk_text: 'Apples are a great source of dietary fiber, which supports digestion and helps maintain a healthy gut.'
}
}
]
},
usage: {
readUnits: 6,
embedTotalTokens: 8
}
}
​
Search with a dense vector
To search a dense index with a dense vector representation of a query, use the query operation with the following parameters:
The namespace to query. To use the default namespace, set the namespace to "**default**".
The vector parameter with the dense vector values representing your query.
The top_k parameter with the number of results to return.
Optionally, you can set include_values and/or include_metadata to true to include the vector values and/or metadata of the matching records in the response. However, when querying with top_k over 1000, avoid returning vector data or metadata for optimal performance.
For example, the following code uses a dense vector representation of the query “Disease prevention” to search for the 3 most semantically similar records in the example-namespaces namespace:

C#

curl
import { Pinecone } from '@pinecone-database/pinecone'

const pc = new Pinecone({ apiKey: "YOUR_API_KEY" })

// To get the unique host for an index,
// see https://docs.pinecone.io/guides/manage-data/target-an-index
const index = pc.index("INDEX_NAME", "INDEX_HOST")

const queryResponse = await index.namespace('example-namespace').query({
vector: [0.0236663818359375,-0.032989501953125,...,-0.01041412353515625,0.0086669921875],
topK: 3,
includeValues: false,
includeMetadata: true,
});
The response will look as follows. Each record is returned with a similarity score that represents its distance to the query vector, calculated according to the similarity metric for the index.

C#

curl
{
matches: [
{
id: 'rec3',
score: 0.819709897,
values: [],
sparseValues: undefined,
metadata: [Object]
},
{
id: 'rec1',
score: 0.792900264,
values: [],
sparseValues: undefined,
metadata: [Object]
},
{
id: 'rec4',
score: 0.780068815,
values: [],
sparseValues: undefined,
metadata: [Object]
}
],
namespace: 'example-namespace',
usage: { readUnits: 6 }
}
​
Search with a record ID
When you search with a record ID, Pinecone uses the dense vector associated with the record as the query. To search a dense index with a record ID, use the query operation with the following parameters:
The namespace to query. To use the default namespace, set the namespace to "**default**".
The id parameter with the unique record ID containing the vector to use as the query.
The top_k parameter with the number of results to return.
Optionally, you can set include_values and/or include_metadata to true to include the vector values and/or metadata of the matching records in the response. However, when querying with top_k over 1000, avoid returning vector data or metadata for optimal performance.
For example, the following code uses an ID to search for the 3 records in the example-namespace namespace that are most semantically similar to the dense vector in the record:

C#

curl
import { Pinecone } from '@pinecone-database/pinecone'

const pc = new Pinecone({ apiKey: "YOUR_API_KEY" })

// To get the unique host for an index,
// see https://docs.pinecone.io/guides/manage-data/target-an-index
const index = pc.index("INDEX_NAME", "INDEX_HOST")

const queryResponse = await index.namespace('example-namespace').query({
id: 'rec2',
topK: 3,
includeValues: false,
includeMetadata: true,
});
​
