package com.example.kafkaVisualiser.model;

import lombok.Data;
import lombok.RequiredArgsConstructor;

@Data
public class BrokerInfo {
    private int id;
    private String host;
    private int port;

    public BrokerInfo(int id, String host, int port) {
        this.id = id;
        this.host = host;
        this.port = port;
    }
}
