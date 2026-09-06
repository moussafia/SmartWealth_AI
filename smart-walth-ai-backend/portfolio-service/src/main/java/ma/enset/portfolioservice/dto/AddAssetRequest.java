package ma.enset.portfolioservice.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import ma.enset.portfolioservice.enums.AssetType;

import java.math.BigDecimal;

@Data
public class AddAssetRequest {

    @NotBlank(message = "Symbol is required")
    private String symbol;

    @NotBlank(message = "Name is required")
    private String name;

    //@NotNull(message = "Asset type is required")
    //private AssetType assetType;

    @NotNull(message = "Quantity is required")
    @DecimalMin(value = "0.0", inclusive = false)
    private BigDecimal quantity;

    @NotNull(message = "Buy price is required")
    @DecimalMin(value = "0.0", inclusive = false)
    private BigDecimal buyPrice;
}