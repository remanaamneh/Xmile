package com.xmile.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AIMessageResponse {
    private List<String> contentOptions;
    private List<DesignOption> designOptions;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DesignOption {
        private String name;
        private String description;
        private List<String> colors;
    }
}

