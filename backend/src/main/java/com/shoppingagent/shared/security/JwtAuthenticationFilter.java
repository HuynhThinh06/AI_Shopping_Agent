package com.shoppingagent.shared.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Slf4j
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final UserAuthCacheService userAuthCacheService;

    @Autowired
    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider,
                                   @Autowired(required = false) UserAuthCacheService userAuthCacheService) {
        this.tokenProvider = tokenProvider;
        this.userAuthCacheService = userAuthCacheService;
    }

    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider) {
        this(tokenProvider, null);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);
            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                Claims claims = tokenProvider.getClaimsFromToken(jwt);
                String username = claims.getSubject();
                String role = claims.get("role", String.class);
                Integer userId = claims.get("userId", Integer.class);
                String email = claims.get("email", String.class);

                if (userAuthCacheService != null) {
                    UserAuthCacheService.UserAuthSnapshot snapshot = (userId != null)
                            ? userAuthCacheService.getSnapshot(userId)
                            : userAuthCacheService.getSnapshotByUsername(username);

                    if (snapshot == null || !snapshot.active()) {
                        log.warn("[JWT Filter] Rejected token for inactive or non-existent user: userId={}, username={}",
                                userId, username);
                        filterChain.doFilter(request, response);
                        return;
                    }

                    if (snapshot.id() != null) userId = snapshot.id();
                    if (snapshot.username() != null) username = snapshot.username();
                    if (snapshot.email() != null) email = snapshot.email();
                    if (snapshot.role() != null && !snapshot.role().isBlank()) {
                        role = snapshot.role();
                    }
                }

                String formattedRole = (role != null && !role.isBlank()) ? role.trim().toUpperCase() : "USER";
                if (!formattedRole.startsWith("ROLE_")) {
                    formattedRole = "ROLE_" + formattedRole;
                }

                List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(formattedRole));
                UserPrincipal principal = UserPrincipal.builder()
                        .id(userId)
                        .username(username)
                        .email(email)
                        .role(role)
                        .build();

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(principal, null, authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception ex) {
            log.error("[JWT Filter] Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
