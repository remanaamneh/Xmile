package com.xmile.api.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@RestController
public class HealthController {
    
    @Value("${server.port:8080}")
    private int serverPort;
    
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Collections.singletonMap("status", "ok"));
    }
    
    @GetMapping("/api/info")
    public ResponseEntity<Map<String, Object>> getServerInfo() {
        try {
            Map<String, Object> info = new HashMap<>();
            
            // Get database host from environment or default
            String dbHost = System.getenv("DB_HOST");
            if (dbHost == null || dbHost.isEmpty()) {
                dbHost = "localhost";
            }
            
            // Determine if running locally or online
            boolean isLocal = dbHost.equals("localhost") || dbHost.equals("127.0.0.1");
            
            info.put("serverPort", serverPort);
            info.put("databaseHost", dbHost);
            info.put("isLocal", isLocal);
            info.put("environment", isLocal ? "local" : "production");
            info.put("serverUrl", isLocal ? "http://localhost:" + serverPort : "https://your-domain.com");
            
            return ResponseEntity.ok(info);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            error.put("serverPort", serverPort);
            error.put("isLocal", true); // Default to local on error
            return ResponseEntity.status(500).body(error);
        }
    }
}

