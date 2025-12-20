package com.xmile.api.security;

import com.xmile.api.model.Role;
import com.xmile.api.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.lang.NonNull;

import java.io.IOException;
import java.util.Collections;

@Component
@SuppressWarnings("null")
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    public JwtAuthFilter(JwtTokenProvider jwtTokenProvider, UserRepository userRepository) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        
        // Skip JWT filter for static resources and public endpoints
        if (path.equals("/") || 
            path.equals("/index.html") || 
            path.equals("/dashboard.html") ||
            path.startsWith("/health") ||
            path.startsWith("/auth/") ||
            path.endsWith(".html") ||
            path.endsWith(".css") ||
            path.endsWith(".js") ||
            path.endsWith(".jpg") ||
            path.endsWith(".png") ||
            path.endsWith(".webp") ||
            path.endsWith(".ico") ||
            path.startsWith("/js/") ||
            path.startsWith("/css/") ||
            path.startsWith("/partner-ui/") ||
            path.startsWith("/static/")) {
            filterChain.doFilter(request, response);
            return;
        }

        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = getTokenFromRequest(request);

        try {
            if (token != null && jwtTokenProvider.validateToken(token)) {
                Long userId = jwtTokenProvider.getUserIdFromToken(token);
                // Prefer DB role/isActive so admin changes take effect immediately.
                var userOpt = userRepository.findById(userId);
                if (userOpt.isEmpty()) {
                    filterChain.doFilter(request, response);
                    return;
                }
                var user = userOpt.get();
                if (Boolean.FALSE.equals(user.getIsActive())) {
                    filterChain.doFilter(request, response);
                    return;
                }

                Role role = user.getRole();

                var authorities = Collections.singletonList(
                        new SimpleGrantedAuthority("ROLE_" + role.name())
                );

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userId, null, authorities);

                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception ignored) {
           
        }

        filterChain.doFilter(request, response);
    }

    private String getTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
