package ma.enset.portfolioservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.enset.portfolioservice.dto.*;
import ma.enset.portfolioservice.service.WalletService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/wallets")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    @GetMapping
    public ResponseEntity<List<WalletDto>> getMyWallets(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(walletService.getWalletsByUser(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WalletDto> getWallet(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(walletService.getWalletById(id, userId));
    }

    @PostMapping
    public ResponseEntity<WalletDto> createWallet(
            @Valid @RequestBody CreateWalletRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return new ResponseEntity<>(
                walletService.createWallet(request, userId),
                HttpStatus.CREATED);
    }

    @PostMapping("/{id}/assets")
    public ResponseEntity<WalletDto> addAsset(
            @PathVariable UUID id,
            @Valid @RequestBody AddAssetRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(walletService.addAsset(id, request, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWallet(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        walletService.deleteWallet(id, userId);
        return ResponseEntity.noContent().build();
    }
}