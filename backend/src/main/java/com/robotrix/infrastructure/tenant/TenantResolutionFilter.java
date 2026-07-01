package com.robotrix.infrastructure.tenant;

import com.robotrix.security.JwtService;
import com.robotrix.security.RobotrixUserDetails;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.hibernate.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.UUID;
import com.robotrix.repository.TenantRepository;
import com.robotrix.model.Tenant;

@Component
public class TenantResolutionFilter extends OncePerRequestFilter {

    @Autowired
    private JwtService jwtService;

    @Autowired
    @org.springframework.context.annotation.Lazy
    private UserDetailsService userDetailsService;

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    @org.springframework.context.annotation.Lazy
    private TenantRepository tenantRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String username;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);
        try {
            username = jwtService.extractUsername(jwt);
            UUID tenantId = jwtService.extractTenantId(jwt);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                RobotrixUserDetails userDetails = (RobotrixUserDetails) this.userDetailsService.loadUserByUsername(username);
                
                if (jwtService.isTokenValid(jwt, userDetails)) {
                    boolean tenantActive = true;
                    if (userDetails.getTenantId() != null) {
                        tenantActive = tenantRepository.findById(userDetails.getTenantId())
                                .map(Tenant::isActive)
                                .orElse(false);
                    }

                    if (userDetails.isEnabled() && tenantActive) {
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities()
                        );
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                        
                        if (tenantId != null) {
                            TenantContext.set(tenantId);
                            entityManager.unwrap(Session.class)
                                    .enableFilter("tenantFilter")
                                    .setParameter("tenantId", tenantId);
                        }
                    } else {
                        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        response.getWriter().write("Access Denied: Account or Hospital is deactivated");
                        return;
                    }
                }
            }
        } catch (Exception e) {
            logger.error("Authentication/tenant resolution failed", e);
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.getWriter().write("Access Denied: Invalid credentials or token");
            return;
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            if (entityManager != null && entityManager.isOpen()) {
                try {
                    entityManager.unwrap(Session.class).disableFilter("tenantFilter");
                } catch (Exception ignored) {}
            }
            TenantContext.clear();
        }
    }
}
