package ma.enset.portfolioservice.mapper;

import ma.enset.portfolioservice.dto.AssetDto;
import ma.enset.portfolioservice.dto.WalletDto;
import ma.enset.portfolioservice.entity.Asset;
import ma.enset.portfolioservice.entity.Wallet;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class WalletMapper {

    public WalletDto toDto(Wallet wallet) {
        List<AssetDto> assetDtos = wallet.getAssets().stream()
                .map(this::toAssetDto)
                .toList();

        return WalletDto.builder()
                .id(wallet.getId())
                .name(wallet.getName())
                .type(wallet.getType())
                .currency(wallet.getCurrency())
                .balance(wallet.getBalance())
                .totalValue(wallet.getTotalValue())
                .assetCount(wallet.getAssets().size())
                .assets(assetDtos)
                .createdAt(wallet.getCreatedAt())
                .build();
    }

    public AssetDto toAssetDto(Asset asset) {
        return AssetDto.builder()
                .id(asset.getId())
                .symbol(asset.getSymbol())
                .name(asset.getName())
                .assetType(asset.getAssetType())
                .quantity(asset.getQuantity())
                .avgBuyPrice(asset.getAvgBuyPrice())
                .currentPrice(asset.getCurrentPrice())
                .totalValue(asset.getTotalValue())
                .profitLoss(asset.getProfitLoss())
                .profitLossPercentage(asset.getProfitLossPercentage())
                .build();
    }
}