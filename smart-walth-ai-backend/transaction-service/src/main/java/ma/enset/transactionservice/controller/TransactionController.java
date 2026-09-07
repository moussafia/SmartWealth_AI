package ma.enset.transactionservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.enset.transactionservice.dto.CreateTransactionRequest;
import ma.enset.transactionservice.dto.TransactionDto;
import ma.enset.transactionservice.service.TransactionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService service;

    @PostMapping
    public ResponseEntity<TransactionDto> create(
            @Valid @RequestBody CreateTransactionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return new ResponseEntity<>(service.create(request, userId), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<TransactionDto>> myTransactions(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(service.getMyTransactions(userId));
    }
}