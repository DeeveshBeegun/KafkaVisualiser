package com.example.kafkaVisualiser.service;

import org.springframework.stereotype.Service;

import javax.management.*;
import javax.management.remote.JMXConnector;
import javax.management.remote.JMXConnectorFactory;
import javax.management.remote.JMXServiceURL;
import java.io.IOException;
import java.util.Set;

@Service
public class BrokerService {

    public static void main(String[] args) throws IOException {
        String host = "localhost";
        String port = "9999";

        String url = String.format("service:jmx:rmi:///jndi/rmi://%s:%s/jmxrmi", host, port);

        JMXServiceURL jmxServiceURL = new JMXServiceURL(url);
        JMXConnector jmxConnector = JMXConnectorFactory.connect(jmxServiceURL);

        try {
            MBeanServerConnection mBeanServerConnection = jmxConnector.getMBeanServerConnection();

            ObjectName query = new ObjectName("kafka.server:type=BrokerTopicMetrics,*");
            Set<ObjectName> mbeans = mBeanServerConnection.queryNames(query, null);

            for (ObjectName name : mbeans) {
                Object count = mBeanServerConnection.getAttribute(name, "Count");
                System.out.println(name + " Count: " + count);
            }

        } catch (MalformedObjectNameException e) {
            throw new RuntimeException(e);
        } catch (ReflectionException e) {
            throw new RuntimeException(e);
        } catch (AttributeNotFoundException e) {
            throw new RuntimeException(e);
        } catch (InstanceNotFoundException e) {
            throw new RuntimeException(e);
        } catch (MBeanException e) {
            throw new RuntimeException(e);
        } finally {
            jmxConnector.close();
        }

    }

    public void getBrokerMetric() {

    }

}
