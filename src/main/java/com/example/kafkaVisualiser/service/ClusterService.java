package com.example.kafkaVisualiser.service;

import com.example.kafkaVisualiser.model.BrokerInfo;
import com.example.kafkaVisualiser.model.ClusterInfo;
import com.example.kafkaVisualiser.model.TopicInfo;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.DescribeClusterResult;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
public class ClusterService {

    private final AdminClient adminClient;

    public ClusterService(AdminClient adminClient) {
        this.adminClient = adminClient;
    }

    public ClusterInfo getClusterInfo() throws ExecutionException, InterruptedException {
        DescribeClusterResult cluster = adminClient.describeCluster();

        List<BrokerInfo> brokers = cluster.nodes().get().stream()
                .map(node -> new BrokerInfo(node.id(), node.host(), node.port()))
                .collect(Collectors.toList());
        return new ClusterInfo(cluster.clusterId().get(), brokers, cluster.controller().get().id());

    }

    public List<BrokerInfo> getBrokerInfo() throws ExecutionException, InterruptedException {
        DescribeClusterResult clusterResult = adminClient.describeCluster();
        return clusterResult.nodes().get().stream()
                .map(node -> new BrokerInfo(node.id(), node.host(), node.port()))
                .collect(Collectors.toList());
    }

    public int getNumberOfBrokers() throws ExecutionException, InterruptedException {
        DescribeClusterResult clusterResult = adminClient.describeCluster();
        return clusterResult.nodes().get().size();
    }

    public List<TopicInfo> getTopicInfo() throws ExecutionException, InterruptedException {
        var names = adminClient.listTopics().names().get();
        var topicDescriptions = adminClient.describeTopics(names).allTopicNames().get();
        return topicDescriptions.entrySet().stream()
                .map(topicDesc -> new TopicInfo(topicDesc.getKey(),
                        topicDesc.getValue().partitions().size(),
                        topicDesc.getValue().partitions().get(0).replicas().size()))
                .toList();
    }

    public int getNumberOfTopics() throws ExecutionException, InterruptedException {
        var names = adminClient.listTopics().names().get();
        return names.size();
    }
}
