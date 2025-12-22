package com.xmile.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkerMeResponse {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String city;
    private String locationText;
    private String availability;
}


