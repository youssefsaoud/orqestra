package com.example.crm.users;

import java.util.UUID;

public record DashboardAssociateResponse(UUID id, String fullName, boolean active) {}
