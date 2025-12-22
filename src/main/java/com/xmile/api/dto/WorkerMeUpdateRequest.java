package com.xmile.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkerMeUpdateRequest {
    @NotBlank(message = "שם הוא חובה")
    private String name;
    
    @Email(message = "אימייל לא תקין")
    @NotBlank(message = "אימייל הוא חובה")
    private String email;
    
    private String phone;
    private String city;
    private String locationText;
    private String availability;
}


