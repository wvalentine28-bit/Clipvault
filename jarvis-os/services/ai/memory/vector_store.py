import asyncio
from typing import Optional, List, Dict, Any
import structlog

logger = structlog.get_logger()

COLLECTION_NAME = "jarvis_memories"


class VectorStore:
    def __init__(self):
        self.client = None
        self.collection = None
        self._embedding_fn = None

    async def initialize(self):
        from config import settings

        loop = asyncio.get_event_loop()

        try:
            await loop.run_in_executor(None, self._init_chroma)
        except Exception as e:
            logger.error("ChromaDB init failed", error=str(e))
            try:
                await loop.run_in_executor(None, self._init_pinecone)
            except Exception as e2:
                logger.error("Pinecone init also failed", error=str(e2))

    def _init_chroma(self):
        import chromadb
        from chromadb.config import Settings
        from config import settings

        self.client = chromadb.HttpClient(
            host=settings.chroma_host,
            port=settings.chroma_port,
        )

        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("ChromaDB connected", collection=COLLECTION_NAME)

    def _init_pinecone(self):
        from pinecone import Pinecone
        from config import settings

        if not settings.pinecone_api_key:
            raise ValueError("PINECONE_API_KEY not configured")

        pc = Pinecone(api_key=settings.pinecone_api_key)
        self.client = pc.Index(settings.pinecone_index)
        logger.info("Pinecone connected", index=settings.pinecone_index)

    async def embed(self, text: str) -> List[float]:
        from config import settings

        if settings.openai_api_key:
            import openai
            client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
            response = await client.embeddings.create(
                model="text-embedding-3-small",
                input=text,
            )
            return response.data[0].embedding

        # Fallback: fastembed (local, free, no API key required)
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._embed_local, text)

    def _embed_local(self, text: str) -> List[float]:
        if self._embedding_fn is None:
            from fastembed import TextEmbedding
            self._embedding_fn = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
        embeddings = list(self._embedding_fn.embed([text]))
        return embeddings[0].tolist()

    async def add_memory(
        self,
        memory_id: str,
        content: str,
        metadata: Dict[str, Any],
    ) -> None:
        if not self.collection:
            logger.warning("Vector store not initialized")
            return

        embedding = await self.embed(content)

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            self._add_to_collection,
            memory_id,
            content,
            embedding,
            metadata,
        )

    def _add_to_collection(
        self,
        memory_id: str,
        content: str,
        embedding: List[float],
        metadata: Dict[str, Any],
    ):
        self.collection.upsert(
            ids=[memory_id],
            documents=[content],
            embeddings=[embedding],
            metadatas=[metadata],
        )

    async def search(
        self,
        query: str,
        user_id: str,
        n_results: int = 10,
        where: Optional[Dict] = None,
    ) -> List[Dict[str, Any]]:
        if not self.collection:
            return []

        query_embedding = await self.embed(query)
        where_filter = {"user_id": user_id}
        if where:
            where_filter.update(where)

        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            None,
            lambda: self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where_filter if where_filter else None,
                include=["documents", "metadatas", "distances"],
            ),
        )

        memories = []
        if results and results.get("ids"):
            for i, memory_id in enumerate(results["ids"][0]):
                memories.append(
                    {
                        "id": memory_id,
                        "content": results["documents"][0][i],
                        "metadata": results["metadatas"][0][i],
                        "score": 1 - results["distances"][0][i],
                    }
                )

        return memories

    async def delete_memory(self, memory_id: str):
        if not self.collection:
            return

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None, lambda: self.collection.delete(ids=[memory_id])
        )


vector_store = VectorStore()
