package ma.enset.userservice.enums;


/**
 * KYC = "Know Your Customer"
 *
 * In finance, platforms are LEGALLY REQUIRED to verify user identity
 * before allowing transactions. This is an anti-money-laundering (AML) regulation.
 *
 * PENDING  → user registered but identity not yet verified
 * VERIFIED → identity confirmed, user can trade/transact
 */
public enum KycStatus {
    PENDING,
    VERIFIED
}
