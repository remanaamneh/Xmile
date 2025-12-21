package com.xmile.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        // Explicitly configure static resources
        // IMPORTANT: Only serve specific file types - NOT /client/** or /admin/**
        // This ensures API endpoints are handled by controllers, not static resource handler
        
        // Serve HTML files (but not /client/*.html or /admin/*.html)
        registry.addResourceHandler("/*.html")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(0);
        
        // Serve CSS files
        registry.addResourceHandler("/*.css", "/css/**")
                .addResourceLocations("classpath:/static/", "classpath:/static/css/")
                .setCachePeriod(0);
        
        // Serve JS files
        registry.addResourceHandler("/*.js", "/js/**")
                .addResourceLocations("classpath:/static/", "classpath:/static/js/")
                .setCachePeriod(0);
        
        // Serve images and other static assets
        registry.addResourceHandler("/*.jpg", "/*.png", "/*.webp", "/*.ico", "/favicon.ico", "/static/**")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(0);
    }
}

