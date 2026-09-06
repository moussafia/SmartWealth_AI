package ma.enset.portfolioservice.service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.enset.portfolioservice.entity.Asset;
import ma.enset.portfolioservice.repository.AssetRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
@Slf4j
public class PriceService {

    private final AssetRepository assetRepository;
    private final RestClient restClient = RestClient.create();

    // CoinGecko uses IDs like "bitcoin", not symbols like "BTC"
    // This map converts between them
    private static final Map<String, String> SYMBOL_TO_COINGECKO_ID = Map.ofEntries(
            Map.entry("BTC", "bitcoin"),
            Map.entry("ETH", "ethereum"),
            Map.entry("SOL", "solana"),
            Map.entry("BNB", "binancecoin"),
            Map.entry("XRP", "ripple"),
            Map.entry("ADA", "cardano"),
            Map.entry("DOGE", "dogecoin"),
            Map.entry("DOT", "polkadot"),
            Map.entry("MATIC", "matic-network"),
            Map.entry("AVAX", "avalanche-2"),
            Map.entry("LINK", "chainlink"),
            Map.entry("UNI", "uniswap"),
            Map.entry("ATOM", "cosmos"),
            Map.entry("LTC", "litecoin"),
            Map.entry("NEAR", "near")
    );


    /**
     * Get the current price of a single crypto.
     * Called when a user adds a new asset.
     *
     * CoinGecko API (free, no key):
     * GET https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd
     * Response: { "bitcoin": { "usd": 65432.12 } }
     */
    public BigDecimal getCurrentPrice(String symbol) {
        String coinId = SYMBOL_TO_COINGECKO_ID.getOrDefault(
                symbol.toUpperCase(), symbol.toLowerCase());

        try {
            Map<String, Map<String, Number>> response = restClient.get()
                    .uri("https://api.coingecko.com/api/v3/simple/price?ids={id}&vs_currencies=usd",
                            coinId)
                    .retrieve()
                    .body(Map.class);

            if (response != null && response.containsKey(coinId)) {
                Number price = response.get(coinId).get("usd");
                return new BigDecimal(price.toString());
            }

            log.warn("No price found for symbol: {}", symbol);
            return BigDecimal.ZERO;

        } catch (Exception e) {
            log.error("Failed to fetch price for {}: {}", symbol, e.getMessage());
            return BigDecimal.ZERO;
        }
    }

    /**
     * Bulk fetch prices for multiple cryptos at once.
     * More efficient than calling one by one.
     *
     * CoinGecko API:
     * GET /simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd
     * Response: { "bitcoin": {"usd": 65000}, "ethereum": {"usd": 3400}, ... }
     */
    public Map<String, BigDecimal> getCurrentPrices(List<String> symbols) {
        // Convert symbols to CoinGecko IDs
        String ids = symbols.stream()
                .map(s -> SYMBOL_TO_COINGECKO_ID.getOrDefault(
                        s.toUpperCase(), s.toLowerCase()))
                .distinct()
                .collect(Collectors.joining(","));

        if (ids.isEmpty()) return Map.of();

        try {
            Map<String, Map<String, Number>> response = restClient.get()
                    .uri("https://api.coingecko.com/api/v3/simple/price?ids={ids}&vs_currencies=usd",
                            ids)
                    .retrieve()
                    .body(Map.class);

            if (response == null) return Map.of();

            // Convert back: CoinGecko ID → symbol → price
            return symbols.stream()
                    .filter(s -> {
                        String coinId = SYMBOL_TO_COINGECKO_ID.getOrDefault(
                                s.toUpperCase(), s.toLowerCase());
                        return response.containsKey(coinId);
                    })
                    .collect(Collectors.toMap(
                            String::toUpperCase,
                            s -> {
                                String coinId = SYMBOL_TO_COINGECKO_ID.getOrDefault(
                                        s.toUpperCase(), s.toLowerCase());
                                Number price = response.get(coinId).get("usd");
                                return new BigDecimal(price.toString());
                            }
                    ));

        } catch (Exception e) {
            log.error("Failed to fetch bulk prices: {}", e.getMessage());
            return Map.of();
        }
    }

    /**
     * Scheduled job — updates ALL asset prices every 5 minutes.
     *
     * @Scheduled(fixedRate = 300000) = run every 300,000 ms = 5 minutes
     *
     * Flow:
     * 1. Load all assets from database
     * 2. Collect unique symbols: [BTC, ETH, SOL]
     * 3. One API call to CoinGecko for all symbols
     * 4. Update currentPrice for each asset
     * 5. Save all to database
     */
    @Scheduled(fixedRate = 300000)
    @Transactional
    public void updateAllPrices() {
        List<Asset> allAssets = assetRepository.findAll();

        if (allAssets.isEmpty()) {
            return;
        }

        // Get unique symbols
        List<String> symbols = allAssets.stream()
                .map(Asset::getSymbol)
                .distinct()
                .toList();

        log.info("Updating prices for {} symbols: {}", symbols.size(), symbols);

        // Fetch all prices in ONE API call
        Map<String, BigDecimal> prices = getCurrentPrices(symbols);

        // Update each asset
        int updated = 0;
        for (Asset asset : allAssets) {
            BigDecimal newPrice = prices.get(asset.getSymbol().toUpperCase());
            if (newPrice != null && newPrice.compareTo(BigDecimal.ZERO) > 0) {
                asset.setCurrentPrice(newPrice);
                updated++;
            }
        }

        assetRepository.saveAll(allAssets);
        log.info("Updated {} asset prices", updated);
    }

}
