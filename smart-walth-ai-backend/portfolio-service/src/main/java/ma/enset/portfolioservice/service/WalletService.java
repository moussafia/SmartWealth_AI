package ma.enset.portfolioservice.service;

import lombok.RequiredArgsConstructor;
import ma.enset.portfolioservice.dto.*;
import ma.enset.portfolioservice.entity.Asset;
import ma.enset.portfolioservice.entity.Wallet;
import ma.enset.portfolioservice.enums.AssetType;
import ma.enset.portfolioservice.mapper.WalletMapper;
import ma.enset.portfolioservice.repository.WalletRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletRepository walletRepository;
    private final WalletMapper walletMapper;
    private final PriceService priceService;

    public List<WalletDto> getWalletsByUser(UUID userId) {
        return walletRepository.findByUserId(userId).stream()
                .map(walletMapper::toDto)
                .toList();
    }

    public WalletDto getWalletById(UUID walletId, UUID userId) {
        Wallet wallet = findWalletOrThrow(walletId, userId);
        return walletMapper.toDto(wallet);
    }

    public WalletDto createWallet(CreateWalletRequest request, UUID userId) {
        Wallet wallet = Wallet.builder()
                .userId(userId)
                .name(request.getName())
                .type(request.getType())
                .currency(request.getCurrency() != null ? request.getCurrency() : "MAD")
                .build();

        return walletMapper.toDto(walletRepository.save(wallet));
    }

    @Transactional
    public WalletDto addAsset(UUID walletId, AddAssetRequest request, UUID userId) {
        Wallet wallet = findWalletOrThrow(walletId, userId);

        BigDecimal currentPrice = priceService.getCurrentPrice(request.getSymbol());

        Asset asset = Asset.builder()
                .symbol(request.getSymbol().toUpperCase())
                .name(request.getName())
                .assetType(AssetType.CRYPTO)
                .quantity(request.getQuantity())
                .avgBuyPrice(request.getBuyPrice())
                .currentPrice(currentPrice)
                .wallet(wallet)
                .build();

        wallet.getAssets().add(asset);
        return walletMapper.toDto(walletRepository.save(wallet));
    }

    public void deleteWallet(UUID walletId, UUID userId) {
        Wallet wallet = findWalletOrThrow(walletId, userId);
        walletRepository.delete(wallet);
    }

    @Transactional(readOnly = true)
    public PortfolioSummaryDto getPortfolioSummary(UUID userId) {
        List<Wallet> wallets = walletRepository.findByUserId(userId);

        BigDecimal totalValue = wallets.stream()
                .map(Wallet::getTotalValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalProfitLoss = wallets.stream()
                .flatMap(w -> w.getAssets().stream())
                .map(Asset::getProfitLoss)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int totalAssets = wallets.stream()
                .mapToInt(w -> w.getAssets().size())
                .sum();

        return PortfolioSummaryDto.builder()
                .userId(userId)
                .totalWallets(wallets.size())
                .totalAssets(totalAssets)
                .totalPortfolioValue(totalValue)
                .totalProfitLoss(totalProfitLoss)
                .wallets(wallets.stream().map(walletMapper::toDto).toList())
                .build();
    }

    public Wallet getWalletEntity(UUID walletId, UUID userId) {
        return findWalletOrThrow(walletId, userId);
    }

    private Wallet findWalletOrThrow(UUID walletId, UUID userId) {
        return walletRepository.findByIdAndUserId(walletId, userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Wallet not found"));
    }


}