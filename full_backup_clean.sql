-- MySQL dump 10.13  Distrib 8.0.44, for Linux (x86_64)
--
-- Host: formula-timba-db.cv0cgcmus6as.sa-east-1.rds.amazonaws.com    Database: formula-timba-db
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Pilots`
--

DROP TABLE IF EXISTS `Pilots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Pilots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `acronym` varchar(255) NOT NULL,
  `number` varchar(255) NOT NULL,
  `team` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Pilots`
--

LOCK TABLES `Pilots` WRITE;
/*!40000 ALTER TABLE `Pilots` DISABLE KEYS */;
INSERT INTO `Pilots` VALUES (1,'Max Verstappen','VER','3','Red Bull','2025-12-10 19:58:37','2025-12-10 19:58:37'),(2,'Isack Hadjar','HAD','6','Red Bull','2025-12-10 19:58:37','2025-12-10 19:58:37'),(3,'Lewis Hamilton','HAM','44','Ferrari','2025-12-10 19:58:37','2025-12-10 19:58:37'),(4,'Charles Leclerc','LEC','16','Ferrari','2025-12-10 19:58:38','2025-12-10 19:58:38'),(5,'Lando Norris','NOR','1','McLaren','2025-12-10 19:58:38','2025-12-10 19:58:38'),(6,'Oscar Piastri','PIA','81','McLaren','2025-12-10 19:58:38','2025-12-10 19:58:38'),(7,'George Russell','RUS','63','Mercedes','2025-12-10 19:58:38','2025-12-10 19:58:38'),(8,'Andrea Antonelli','ANT','12','Mercedes','2025-12-10 19:58:38','2025-12-10 19:58:38'),(9,'Sergio Pérez','PER','11','Cadillac','2025-12-10 19:58:39','2025-12-10 19:58:39'),(10,'Valtteri Bottas','BOT','77','Cadillac','2025-12-10 19:58:39','2025-12-10 19:58:39'),(11,'Fernando Alonso','ALO','14','Aston Martin','2025-12-10 19:58:39','2025-12-10 19:58:39'),(12,'Lance Stroll','STR','18','Aston Martin','2025-12-10 19:58:39','2025-12-10 19:58:39'),(13,'Carlos Sainz','SAI','55','Williams','2025-12-10 19:58:39','2025-12-10 19:58:39'),(14,'Alexander Albon','ALB','23','Williams','2025-12-10 19:58:39','2025-12-10 19:58:39'),(15,'Nico Hülkenberg','HUL','27','Audi','2025-12-10 19:58:40','2025-12-10 19:58:40'),(16,'Gabriel Bortoleto','BOR','5','Audi','2025-12-10 19:58:40','2025-12-10 19:58:40'),(17,'Pierre Gasly','GAS','10','Alpine','2025-12-10 19:58:40','2025-12-10 19:58:40'),(18,'Franco Colapinto','COL','43','Alpine','2025-12-10 19:58:40','2025-12-10 19:58:40'),(19,'Esteban Ocon','OCO','31','Haas','2025-12-10 19:58:40','2025-12-10 19:58:40'),(20,'Oliver Bearman','BEA','87','Haas','2025-12-10 19:58:41','2025-12-10 19:58:41'),(21,'Liam Lawson','LAW','30','Racing Bulls','2025-12-10 19:58:41','2025-12-10 19:58:41'),(22,'Arvid Lindblad','LIN','41','Racing Bulls','2025-12-10 19:58:41','2025-12-10 19:58:41');
/*!40000 ALTER TABLE `Pilots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (3,'dsg','francomiceli.94@gmail.com','$2b$10$6VxnXuajOKmYl42wUIpxDes5p4FDSJeWXSJMwalkVBXcJYeRXElvm','2025-12-12 03:16:45','2025-12-12 03:16:45');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-13 11:31:19
