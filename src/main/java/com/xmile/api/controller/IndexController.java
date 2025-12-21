package com.xmile.api.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class IndexController {
    
    @GetMapping("/")
    public String redirectToSelectRole() {
        return "redirect:/select-role.html";
    }
    
    @GetMapping("/index.html")
    public String redirectIndexToSelectRole() {
        return "redirect:/select-role.html";
    }
}

