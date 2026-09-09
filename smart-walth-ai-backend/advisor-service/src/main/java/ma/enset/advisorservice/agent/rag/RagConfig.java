package ma.enset.advisorservice.agent.rag;

import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.parser.TextDocumentParser;
import dev.langchain4j.data.document.splitter.DocumentSplitters;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.embedding.onnx.allminilml6v2.AllMiniLmL6V2EmbeddingModel;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.rag.content.retriever.EmbeddingStoreContentRetriever;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.inmemory.InMemoryEmbeddingStore;
import dev.langchain4j.store.embedding.EmbeddingStoreIngestor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Configuration
@Slf4j
public class RagConfig {

    /** Modèle d'embedding LOCAL : transforme le texte en vecteurs, sans appel API. */
    @Bean
    public EmbeddingModel embeddingModel() {
        return new AllMiniLmL6V2EmbeddingModel();
    }

    /** Stockage en mémoire des vecteurs (pas de base externe pour la démo). */
    @Bean
    public EmbeddingStore<TextSegment> embeddingStore() {
        return new InMemoryEmbeddingStore<>();
    }

    /**
     * Au démarrage : lit tous les .txt de resources/knowledge/, les découpe,
     * les vectorise et les charge dans le store. C'est l'INGESTION.
     */
    @Bean
    public ContentRetriever contentRetriever(EmbeddingModel embeddingModel,
                                             EmbeddingStore<TextSegment> embeddingStore) throws Exception {

        List<Document> documents = loadKnowledgeDocuments();

        EmbeddingStoreIngestor ingestor = EmbeddingStoreIngestor.builder()
                //Le chevauchement évite de couper une idée en plein milieu.
                .documentSplitter(DocumentSplitters.recursive(300, 30)) // morceaux ~300 chars, 30 de chevauchement
                .embeddingModel(embeddingModel)
                .embeddingStore(embeddingStore)
                .build();

        ingestor.ingest(documents);
        log.info("[RAG] {} documents de connaissance indexés", documents.size());

        // Le retriever : à chaque question, renvoie les 3 morceaux les plus proches.
        return EmbeddingStoreContentRetriever.builder()
                .embeddingStore(embeddingStore)
                .embeddingModel(embeddingModel)
                .maxResults(3)
                .minScore(0.5)   // ignore les morceaux trop peu pertinents
                .build();
    }

    private List<Document> loadKnowledgeDocuments() throws Exception {
        var resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources("classpath:knowledge/*.txt");
        var parser = new TextDocumentParser();
        List<Document> docs = new ArrayList<>();
        for (Resource r : resources) {
            try (InputStream in = r.getInputStream()) {
                docs.add(parser.parse(in));
            }
        }
        return docs;
    }
}