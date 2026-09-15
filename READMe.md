<h1>SmartWealth AI</h1>

<p>
<strong>SmartWealth AI</strong> est une plateforme de gestion de patrimoine à architecture
microservices, augmentée par un agent d'intelligence artificielle. Elle permet à un utilisateur
de centraliser ses actifs (cryptomonnaies, actions, épargne), de suivre leur valorisation en
temps réel, d'effectuer des transactions et de bénéficier d'un conseil financier intelligent.
</p>

<hr>

<h2>🎯 Fonctionnalités</h2>

<ul>
  <li><strong>Authentification & Sécurité</strong> — Inscription, connexion, JWT + refresh token, rôles USER/ADMIN via Keycloak.</li>
  <li><strong>Gestion de portefeuille</strong> — Création de wallets, ajout d'actifs, valorisation temps réel via l'API CoinGecko.</li>
  <li><strong>Transactions</strong> — Dépôt / retrait avec mise à jour asynchrone du solde via Apache Kafka.</li>
  <li><strong>Agent IA</strong> — Assistant intelligent combinant appel d'outils, mémoire conversationnelle et base de connaissances (RAG).</li>
</ul>

<hr>

<h2>🏗️ Architecture</h2>

<p>
Le système repose sur une architecture microservices. Chaque service est autonome, possède
sa propre base de données PostgreSQL (principe <em>database per service</em>), et communique
avec les autres soit de manière synchrone (REST), soit de manière asynchrone (Kafka).
</p>

<img src="images/smartwealthAI_architecture.png">


<h3>Composants</h3>

<table border="1" cellpadding="6" cellspacing="0">
  <tr>
    <th align="left">Composant</th>
    <th align="left">Rôle</th>
    <th align="left">Port</th>
  </tr>
  <tr><td>API Gateway</td><td>Point d'entrée unique, routage, validation JWT</td><td>8080</td></tr>
  <tr><td>Eureka</td><td>Annuaire de découverte des services</td><td>8761</td></tr>
  <tr><td>Keycloak</td><td>Authentification, autorisation, JWT</td><td>8181</td></tr>
  <tr><td>User Service</td><td>Gestion des utilisateurs et profils</td><td>8081</td></tr>
  <tr><td>Portfolio Service</td><td>Portefeuilles, actifs, valorisation</td><td>8082</td></tr>
  <tr><td>Transaction Service</td><td>Dépôts, retraits, événements Kafka</td><td>8083</td></tr>
  <tr><td>Advisor Service</td><td>Agent d'intelligence artificielle</td><td>8085</td></tr>
  <tr><td>Apache Kafka</td><td>Bus d'événements asynchrone</td><td>9092</td></tr>
</table>

<hr>

<h2>🔄 Communication</h2>

<p>Le projet combine deux styles de communication, chacun utilisé là où il est pertinent :</p>

<ul>
  <li><strong>Synchrone (REST)</strong> — lorsqu'une réponse immédiate est requise : vérification du solde avant un retrait, lecture du portefeuille par l'agent IA.</li>
  <li><strong>Asynchrone (Kafka)</strong> — lorsqu'aucune réponse immédiate n'est nécessaire : une transaction publie un événement, le Portfolio Service le consomme et met à jour le solde. Le producteur ignore les consommateurs (découplage total).</li>
</ul>

<hr>

<h2>🤖 L'agent IA</h2>

<p>L'agent combine trois mécanismes complémentaires :</p>

<ul>
  <li><strong>Mémoire (Spring AI)</strong> — l'assistant se souvient des échanges au sein d'une session.</li>
  <li><strong>Outils / Tools (LangChain4j)</strong> — le modèle décide d'appeler des méthodes Java (<code>@Tool</code>) pour accéder aux vraies données du portefeuille via REST.</li>
  <li><strong>RAG (embeddings locaux)</strong> — les documents financiers sont vectorisés et indexés ; à chaque question, les passages pertinents sont récupérés par similarité sémantique.</li>
</ul>

<hr>

<h2>🛠️ Technologies</h2>

<table border="1" cellpadding="6" cellspacing="0">
  <tr><th align="left">Catégorie</th><th align="left">Technologies</th></tr>
  <tr><td>Frontend</td><td>Angular 20, TypeScript, Signals, ngx-translate</td></tr>
  <tr><td>Backend</td><td>Spring Boot, Spring Cloud Gateway, Eureka, Spring Security</td></tr>
  <tr><td>Persistance</td><td>PostgreSQL, JPA / Hibernate</td></tr>
  <tr><td>Messagerie</td><td>Apache Kafka</td></tr>
  <tr><td>Sécurité</td><td>Keycloak, OAuth2, JWT</td></tr>
  <tr><td>Intelligence artificielle</td><td>LangChain4j, Spring AI, OpenAI</td></tr>
  <tr><td>Services externes</td><td>CoinGecko (prix crypto), OpenAI (LLM)</td></tr>
  <tr><td>Outils</td><td>Docker, IntelliJ IDEA, Postman, Git, Maven</td></tr>
</table>

<hr>

<h2>🚀 Démarrage</h2>

<h3>Prérequis</h3>
<ul>
  <li>Java 21</li>
  <li>Node.js 18+ et npm</li>
  <li>Docker & Docker Compose</li>
  <li>Une clé API OpenAI</li>
</ul>

<h3>1. Lancer l'infrastructure (Docker)</h3>
<pre>
docker compose up -d
</pre>
<p>Cette commande démarre PostgreSQL, Keycloak et Kafka.</p>

<h3>2. Configurer la clé OpenAI</h3>
<pre>
export OPENAI_API_KEY=sk-...
</pre>

<h3>3. Lancer les microservices</h3>
<p>Démarrer dans l'ordre : Eureka, puis Gateway, puis les services (User, Portfolio, Transaction, Advisor).</p>
<pre>
cd eureka-server      && ./mvnw spring-boot:run
cd gateway-service    && ./mvnw spring-boot:run
cd user-service       && ./mvnw spring-boot:run
cd portfolio-service  && ./mvnw spring-boot:run
cd transaction-service&& ./mvnw spring-boot:run
cd advisor-service    && ./mvnw spring-boot:run
</pre>

<h3>4. Lancer le frontend</h3>
<pre>
cd frontend
npm install
ng serve --proxy-config proxy.conf.json
</pre>
<p>L'application est accessible sur <code>http://localhost:4200</code>.</p>

<hr>

<h2>📁 Structure du projet</h2>

<pre>
smartwealth-ai/
├── smart-walth-ai-backend/
  ├── eureka-server/
  ├── gateway-service/
  ├── user-service/
  ├── portfolio-service/
  ├── transaction-service/
  ├── advisor-service/
  │   └── src/main/resources/knowledge/   (documents RAG)
├── docker-compose.yml
└── smart-walth-ai-frontend/
</pre>

<hr>

<h2>👥 Auteurs</h2>

<ul>
  <li>MOUSSAFIA Mohammed</li>
  <li>NACIRI Mohammed El Arabi</li>
</ul>

<p><em>Projet de Fin d'Études — Master Ingénierie Informatique : Big Data et Cloud Computing<br>
École Normale Supérieure de l'Enseignement Technique de Mohammedia — Université Hassan II de Casablanca</em></p>
