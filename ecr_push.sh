#!/bin/bash

AWS_REGION=us-east-1
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REPO_NAME=big-brain-ui
IMAGE_TAG=latest

# Build image
docker build --platform linux/amd64 -t $REPO_NAME .

# Create repo (optional)
aws ecr describe-repositories --repository-names $REPO_NAME || \
aws ecr create-repository --repository-name $REPO_NAME

# Tag image
docker tag $REPO_NAME:$IMAGE_TAG $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME:$IMAGE_TAG

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Push image
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME:$IMAGE_TAG
