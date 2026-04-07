package com.ryan.virtual_cosmos;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class VirtualCosmosApplication {

	public static void main(String[] args) {
		SpringApplication.run(VirtualCosmosApplication.class, args);
	}

}
