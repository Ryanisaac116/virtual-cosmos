package com.ryan.virtual_cosmos.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request payload when a new user joins the cosmos.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class JoinRequestDTO {

    private String username;
    private String avatarColor;
}
