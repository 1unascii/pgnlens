from django.db import models

# Create your models here.

class Game(models.Model):
    event = models.CharField(max_length=50)
    site = models.CharField(max_length=50)
    date = models.DateField()
    round = models.IntegerField()
    white_player = models.CharField(max_length=50)
    black_player = models.CharField(max_length=50)
    result = models.CharField(max_length=10)
    white_elo = models.IntegerField()
    black_elo = models.IntegerField()
    time_control = models.CharField(max_length=25)
    end_time = models.DateTimeField()
    termination = models.CharField(max_length=50) 
    moves = models.TextField()

    
    def __str__(self):
        return f"{self.white_player} vs {self.black_player} on {self.date}"
    
    