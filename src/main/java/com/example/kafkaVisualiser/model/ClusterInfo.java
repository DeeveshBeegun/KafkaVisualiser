package com.example.kafkaVisualiser.model;

import lombok.Data;
import lombok.RequiredArgsConstructor;

import java.util.List;

@Data
@RequiredArgsConstructor
public class ClusterInfo {
    private String clusterId;
    private List<BrokerInfo> brokers;
    private int controllerId;

    public ClusterInfo(String clusterId, List<BrokerInfo> brokers, int controllerId) {
        this.clusterId = clusterId;
        this.brokers = brokers;
        this.controllerId = controllerId;
    }

}
