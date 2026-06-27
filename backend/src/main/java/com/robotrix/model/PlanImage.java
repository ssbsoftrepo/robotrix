package com.robotrix.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Entity
@Table(name = "plan_images")
@Data
@EqualsAndHashCode(callSuper = true)
public class PlanImage extends TenantScopedEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private SurgeryPlan plan;

    @Column(name = "image_type", nullable = false)
    private String imageType;

    @Column(name = "mime_type", nullable = false)
    private String mimeType;

    @Lob
    @Column(name = "image_data", columnDefinition = "bytea", nullable = false)
    private byte[] imageData;
}
