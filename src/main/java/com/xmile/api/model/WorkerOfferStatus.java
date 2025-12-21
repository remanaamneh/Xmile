package com.xmile.api.model;

/**
 * Status enum for WorkerOffer
 */
public enum WorkerOfferStatus {
    PENDING,   // Offer sent to worker, waiting for response
    ACCEPTED,  // Worker accepted the offer
    DECLINED   // Worker declined the offer
}

